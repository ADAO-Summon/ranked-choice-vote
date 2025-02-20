import React from 'react';
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { signIn } from "next-auth/react"
import { useRouter } from "next/router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Loader2 } from 'lucide-react';
import { toast } from "sonner";

// Define the form schema
const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
})

const LoginPage = () => {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)

  // Initialize the form
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  })

  // Handle form submission
  const onSubmit = async (values: any) => {
    setIsLoading(true)
    try {
      const result = await signIn("email", {
        email: values.email,
        redirect: false,
        callbackUrl: "/"
      })

      if (result?.error) {
        toast.error("Error", {
          description: "Failed to sign in. Please try again.",
        })
        
      } else {
        toast.success("Success", {
          description: "Check your email for the login link.",
        })
        // Optionally, redirect to a different page
        router.push("/auth/verify-request")
      }
    } catch (error) {
      toast.error("Error", {
        description: "An unexpected error occurred. Please try again.",
      })
    }
    setIsLoading(false)
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Cardano Workshop Login</CardTitle>
          <CardDescription>Enter your email to log in or create an account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="name@example.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      We&apos;ll send a magic link to this email.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button disabled={isLoading} type="submit" className="w-full">
                {
                  isLoading ? <Loader2 className="animate-spin" /> : "Send Magic Link"
                }
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
