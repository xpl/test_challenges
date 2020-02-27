import './style'
import { render } from '../base/dom'

export function renderCircularLoader () {
  const xmlns = 'http://www.w3.org/2000/svg'
  return render ('svg.circular-loader', { xmlns, viewBox: '25 25 50 50' }, [
    render ('circle', { xmlns, cx: 50, cy: 50, r: 20 })
  ])
}
