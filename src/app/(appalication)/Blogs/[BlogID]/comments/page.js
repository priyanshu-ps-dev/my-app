export async function generateMetadata({ params }) {
  const {BlogID} = await params;
  return {
    title: `Blogs ${BlogID}`,
  };
}

export default async function Blog1({params}) {
    
    const paramObj = await params;
    const {BlogID} = paramObj;
    console.log(paramObj);
  return (
    <>
      <h1>Comments of the :- {BlogID}</h1>
    </>
  );
}
