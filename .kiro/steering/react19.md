---
inclusion: manual
---

New hook: useOptimistic
Another common UI pattern when performing a data mutation is to show the final state optimistically while the async request is underway. In React 19, we’re adding a new hook called useOptimistic to make this easier:

function ChangeName({currentName, onUpdateName}) {
const [optimisticName, setOptimisticName] = useOptimistic(currentName);

const submitAction = async formData => {
const newName = formData.get("name");
setOptimisticName(newName);
const updatedName = await updateName(newName);
onUpdateName(updatedName);
};

return (

<form action={submitAction}>
<p>Your name is: {optimisticName}</p>
<p>
<label>Change Name:</label>
<input
type="text"
name="name"
disabled={currentName !== optimisticName}
/>
</p>
</form>
);
}
The useOptimistic hook will immediately render the optimisticName while the updateName request is in progress. When the update finishes or errors, React will automatically switch back to the currentName value.

A common use case in React apps is to perform a data mutation and then update state in response. For example, when a user submits a form to change their name, you will make an API request, and then handle the response. In the past, you would need to handle pending states, errors, optimistic updates, and sequential requests manually.

For example, you could handle the pending and error state in useState:

// Before Actions
function UpdateName({}) {
const [name, setName] = useState("");
const [error, setError] = useState(null);
const [isPending, setIsPending] = useState(false);

const handleSubmit = async () => {
setIsPending(true);
const error = await updateName(name);
setIsPending(false);
if (error) {
setError(error);
return;
}
redirect("/path");
};

return (

<div>
<input value={name} onChange={(event) => setName(event.target.value)} />
<button onClick={handleSubmit} disabled={isPending}>
Update
</button>
{error && <p>{error}</p>}
</div>
);
}
In React 19, we’re adding support for using async functions in transitions to handle pending states, errors, forms, and optimistic updates automatically.

For example, you can use useTransition to handle the pending state for you:

// Using pending state from Actions
function UpdateName({}) {
const [name, setName] = useState("");
const [error, setError] = useState(null);
const [isPending, startTransition] = useTransition();

const handleSubmit = () => {
startTransition(async () => {
const error = await updateName(name);
if (error) {
setError(error);
return;
}
redirect("/path");
})
};

return (

<div>
<input value={name} onChange={(event) => setName(event.target.value)} />
<button onClick={handleSubmit} disabled={isPending}>
Update
</button>
{error && <p>{error}</p>}
</div>
);
}
The async transition will immediately set the isPending state to true, make the async request(s), and switch isPending to false after any transitions. This allows you to keep the current UI responsive and interactive while the data is changing.
---------------------------------------------------------------------->
