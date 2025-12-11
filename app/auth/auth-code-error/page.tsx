export default function AuthCodeError() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
            <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
            <p className="mb-4">
                There was an error verifying your login information. Please try logging in again.
            </p>
            <a
                href="/auth/login"
                className="text-blue-500 hover:text-blue-700 underline"
            >
                Back to Login
            </a>
        </div>
    );
}
