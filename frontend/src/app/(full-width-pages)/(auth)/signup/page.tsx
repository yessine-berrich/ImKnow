import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up | ImKnow",
  description: "Create your ImKnow account",
};

export default function SignUp() {
  return <SignUpForm />;
}