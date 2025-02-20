import { adminHandlerWrapper } from '@/utils/adminHandlerWrapper'
import { finalizeVoting } from '@/utils/adminActions'

export default adminHandlerWrapper('finalizeVoting', finalizeVoting)