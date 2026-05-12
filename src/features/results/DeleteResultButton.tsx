"use client";

type Props = {
  action: (formData: FormData) => Promise<never>;
};

export default function DeleteResultButton({ action }: Props) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Delete this result? The fixture will be marked as scheduled again."))
          e.preventDefault();
      }}
    >
      <button
        type="submit"
        className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50"
      >
        Delete result
      </button>
    </form>
  );
}
