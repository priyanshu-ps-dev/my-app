export const metadata = {
  title: {
    template: "%s | My App",
    default: "My App",
  },
};

export default function RootLayout({ children }) {
  return (
    <html>
      <h1>Header From Marketing</h1>
      <body>{children}</body>
      <h1>Footer From Marketing</h1>
    </html>
  );
}
