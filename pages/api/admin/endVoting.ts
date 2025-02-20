// pages/api/admin/endVoting.ts
import { adminHandlerWrapper } from '@/utils/adminHandlerWrapper'
import { endVoting } from '@/utils/adminActions'

export default adminHandlerWrapper('endVoting', endVoting)