import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <SignUp redirectUrl="/app" />
    </div>
  );
}
