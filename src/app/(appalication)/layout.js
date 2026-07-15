export const metadata = {
  title: {
    template: "%s | My App",
    default: "My App",
  },
};

export default function RootLayout({ children }) {
  return (
    <>
      <h1>Header From Application</h1>
      {children}
      <h1>Footer From Application</h1>
    </>
  );
}
