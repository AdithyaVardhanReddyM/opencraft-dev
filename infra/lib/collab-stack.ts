import * as path from "node:path";
import {
  Stack,
  StackProps,
  Duration,
  CfnOutput,
  aws_appsync as appsync,
  aws_lambda as lambda,
} from "aws-cdk-lib";
import { Construct } from "constructs";

/**
 * Realtime collaboration infrastructure: an AppSync Events API (serverless
 * WebSocket pub/sub) with a single channel namespace `canvas`. Clients
 * publish/subscribe directly over WebSocket — there is no resolver/handler code
 * and the backend never proxies messages.
 *
 * Channel-level authorization is delegated to a Lambda authorizer
 * (infra/lambda/authorizer) which verifies the short-lived HMAC token minted by
 * the Next.js app and matches it to the requested project channel.
 *
 * The shared secret used to sign/verify those tokens is read from the
 * APPSYNC_REALTIME_SHARED_SECRET env var at synth time. Deploy with the same
 * value configured in the Next.js app's environment.
 */
export class CollabStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const sharedSecret = process.env.APPSYNC_REALTIME_SHARED_SECRET;
    if (!sharedSecret) {
      throw new Error(
        "APPSYNC_REALTIME_SHARED_SECRET must be set in the environment before deploying. " +
          "Use the same value as the Next.js app."
      );
    }

    // Authorizer: plain Node (no bundler) — only uses node:crypto.
    const authFn = new lambda.Function(this, "RealtimeAuthorizer", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "..", "lambda", "authorizer")
      ),
      timeout: Duration.seconds(10),
      memorySize: 128,
      environment: { APPSYNC_REALTIME_SHARED_SECRET: sharedSecret },
      description: "Verifies minted realtime tokens for AppSync Events channels",
    });

    const lambdaProvider: appsync.AppSyncAuthProvider = {
      authorizationType: appsync.AppSyncAuthorizationType.LAMBDA,
      lambdaAuthorizerConfig: {
        handler: authFn,
        // Cache authorizer results briefly so reconnect/resubscribe storms
        // don't invoke the Lambda on every frame; the authorizer also returns a
        // ttlOverride bounded by the token's remaining lifetime.
        resultsCacheTtl: Duration.minutes(5),
      },
    };

    const api = new appsync.EventApi(this, "EventApi", {
      apiName: "opencraft-collab",
      authorizationConfig: {
        authProviders: [lambdaProvider],
        connectionAuthModeTypes: [appsync.AppSyncAuthorizationType.LAMBDA],
        defaultPublishAuthModeTypes: [appsync.AppSyncAuthorizationType.LAMBDA],
        defaultSubscribeAuthModeTypes: [appsync.AppSyncAuthorizationType.LAMBDA],
      },
    });

    // One namespace; channels are /canvas/{projectId} (one room per project).
    api.addChannelNamespace("canvas");

    new CfnOutput(this, "EventApiHttpUrl", {
      value: `https://${api.httpDns}/event`,
      description: "Set as APPSYNC_EVENTS_HTTP_URL in the Next.js app",
    });
    new CfnOutput(this, "EventApiRealtimeUrl", {
      value: `wss://${api.realtimeDns}/event/realtime`,
      description: "Set as APPSYNC_EVENTS_REALTIME_URL in the Next.js app",
    });
    new CfnOutput(this, "EventApiHttpDns", {
      value: api.httpDns,
      description: "HTTP host used in the WebSocket auth subprotocol 'host' field",
    });
    new CfnOutput(this, "EventApiId", { value: api.apiId });
  }
}
