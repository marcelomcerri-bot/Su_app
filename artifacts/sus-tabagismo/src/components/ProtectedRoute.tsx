import { ReactNode } from "react";
import { useGetMe } from "@workspace/api-client-react";
import { Redirect } from "wouter";
import { Spinner } from "@/components/ui/spinner";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { data: user, isLoading, isError } = useGetMe({
    query: {
      retry: false,
    } as any
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" className="text-primary" />
      </div>
    );
  }

  if (isError || !user) {
    return <Redirect to="/login" replace />;
  }

  return <>{children}</>;
}
