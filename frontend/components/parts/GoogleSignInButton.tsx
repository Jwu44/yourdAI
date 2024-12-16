import { useAuth } from '@/lib/AuthContext';

export function GoogleSignInButton() {
  const { signIn } = useAuth();

  const handleClick = () => {
    signIn(); // This will now redirect to Google's sign-in page
  };

  return (
    <button
      onClick={handleClick}
      className="px-4 py-2 text-white bg-[#202124] rounded hover:bg-[#303134]"
    >
      Get Started with Google
    </button>
  );
}