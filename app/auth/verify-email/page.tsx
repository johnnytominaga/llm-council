"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

function VerifyEmailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [status, setStatus] = useState<"verifying" | "success" | "error">(
        "verifying"
    );
    const [message, setMessage] = useState("Verifying your email...");

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setMessage("Invalid verification link");
            return;
        }

        const verifyEmail = async () => {
            try {
                const response = await fetch(
                    `${
                        process.env.NEXT_PUBLIC_APP_URL ||
                        "http://localhost:3000"
                    }/api/auth/verify-email`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ token }),
                    }
                );

                if (!response.ok) {
                    throw new Error("Verification failed");
                }

                setStatus("success");
                setMessage("Email verified successfully!");
                setTimeout(() => router.push("/auth"), 2000);
            } catch (err) {
                setStatus("error");
                setMessage("Verification failed. The link may have expired.");
            }
        };

        verifyEmail();
    }, [token, router]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-center">
                        Email Verification
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex flex-col items-center gap-4">
                        {status === "verifying" && (
                            <>
                                <Loader2 className="w-16 h-16 text-black duration-300 animate-spin" />
                                <p className="text-gray-600">{message}</p>
                            </>
                        )}
                        {status === "success" && (
                            <>
                                <CheckCircle className="w-16 h-16 text-green-600" />
                                <div className="text-center">
                                    <p className="text-lg font-semibold text-gray-900">
                                        {message}
                                    </p>
                                    <p className="text-sm text-gray-600 mt-2">
                                        Redirecting to sign in...
                                    </p>
                                </div>
                            </>
                        )}
                        {status === "error" && (
                            <>
                                <XCircle className="w-16 h-16 text-red-600" />
                                <div className="text-center space-y-4">
                                    <p className="text-lg font-semibold text-gray-900">
                                        {message}
                                    </p>
                                    <Button
                                        onClick={() => router.push("/auth")}
                                    >
                                        Go to Sign In
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <VerifyEmailContent />
        </Suspense>
    );
}
