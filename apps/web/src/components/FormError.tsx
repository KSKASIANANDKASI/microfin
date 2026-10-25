/** A failed save, in the server's words where it gave any. */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="notice notice--bad" role="alert">
      {message}
    </div>
  );
}
