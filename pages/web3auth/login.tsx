import { useRouter } from "next/router";
import { useEffect } from "react";



export default function Lgin() {
  const router = useRouter()
  useEffect(() => {
    router.push("/")
  },[]);
  return (
    <div>
    </div>
  );
}
