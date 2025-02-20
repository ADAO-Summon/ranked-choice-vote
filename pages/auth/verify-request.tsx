import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const VerificationPage = () => {
  const router = useRouter();
  const [hostInfo, setHostInfo] = useState('');

  useEffect(() => {
    // This code only runs on the client side
    setHostInfo(`${window.location.hostname}:${window.location.port}`);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Check your email</CardTitle>
          <CardDescription className="text-center">
            A sign in link has been sent to your email address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">
            {hostInfo}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerificationPage;