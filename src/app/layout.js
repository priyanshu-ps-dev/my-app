export const metadata = {
  title: {
    template: "%s | My App",
    default: "My App",
  },
};

export default function RootLayout({ children }) {
  return (
    <>
      <body>{children}</body>
    </>
  );
}
