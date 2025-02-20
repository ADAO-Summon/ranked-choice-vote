
import { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { UserWorkshops } from "@/components/user-workshops";

export default function Index() {
  const [jwt, setJwt] = useState<any>()

  const session = useSession();
  // const { data, isLoading, refetch } = useQuery('latestVote', async () => getJWT(stakeAddress ?? ""), { enabled: !!stakeAddress })


  // const getJWT = async () => {
  //   const res = await fetch(`/api/getJWT`)
  //   const data = await res.json()
  //   return data;
  // }

  // useEffect(() => {
  //   if (session && session.data && session.data.user) {
  //     getJWT().then(d => setJwt(d))
  //   }
  // }, [session])

  if (session.status === "loading") {
    return <div>Loading...</div>;
  }
  if (session && session.data && session.data.user) {
    return (
      <UserWorkshops />
    );
  } else {
    return (
      null
    );
  }

}