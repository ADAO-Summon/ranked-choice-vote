import prisma from '@/lib/prismaClient'
import { GetServerSideProps } from 'next'
import { ManageWorkshops } from '@/components/workshop/manage-workshops'
import { AddManager } from '@/components/add-manager'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'

export default function ManageWorkshopsPage() {
    return <>
        <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Manage Workshops</h1>
        </div>
        <ManageWorkshops />
        <AddManager /> 

    </>
}

export const getServerSideProps: GetServerSideProps = async (context) => {
    const session = await getServerSession(context.req, context.res, authOptions)

    if (!session || !session.user?.email) {
        return {
            redirect: {
                destination: '/api/auth/signin',
                permanent: false,
            },
        }
    }

    const manager = await prisma.manager.findUnique({
        where: { email: session.user.email },
    })

    if (!manager) {
        return {
            redirect: {
                destination: '/',
                permanent: false,
            },
        }
    }

    return {
        props: {},
    }
}