import { notFound } from "next/navigation";


export async function generateStaticParams() {
  const response = await fetch(
    "https://jsonplaceholder.typicode.com/todos"
  );
  const data = await response.json();
  console.log("Generating blog pages");
  return data.map(({ id }) => ({
    BlogID: String(id),
  }));
}

export async function generateMetadata({ params }) {
  const { BlogID } = await params;
  return {
    title: `Blog ${BlogID}`,
    description: `This is blog page ${BlogID}`,
  };
}

export default async function Blog1({ params }) {
  const { BlogID } = await params;
  console.log(BlogID);
  if (isNaN(Number(BlogID))) {
    notFound();
  }
  return (
    <>
      <h1>This is Page of {BlogID}</h1>
    </>
  );
}
