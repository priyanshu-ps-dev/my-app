export default async function comment({ params }) {
  const paramObj = await params;
  const { BlogID, commentId } = paramObj;
  console.log(paramObj);
  return (
    <>
      <h1>Comment <i>{commentId}</i>of the :- {BlogID}</h1>
    </>
  );
}
