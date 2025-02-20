import { adminHandlerWrapper } from '@/utils/adminHandlerWrapper'
import { resetVoting } from '@/utils/adminActions'

export default adminHandlerWrapper('resetVoting', resetVoting)