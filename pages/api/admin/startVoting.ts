import { adminHandlerWrapper } from '@/utils/adminHandlerWrapper'
import { startVoting } from '@/utils/adminActions'

export default adminHandlerWrapper('startVoting', startVoting)