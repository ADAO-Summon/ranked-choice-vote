import { adminHandlerWrapper } from '@/utils/adminHandlerWrapper'
import { getRegistrations } from '@/utils/adminActions'

export default adminHandlerWrapper('getRegistrations', getRegistrations)