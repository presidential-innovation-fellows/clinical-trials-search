import React from 'react'
import { Link, browserHistory } from 'react-router'

// export default function App({ children }) {
//   return (
//     <div>
//       <header>
//         Links:
//         {' '}
//         <Link to="/">Home</Link>
//         {' '}
//         <Link to="/clinical-trial">clinical-trial</Link>
//       </header>
//       <div>
//         <button onClick={() => browserHistory.push('/clinical-trial')}>Go to /clinical-trial</button>
//       </div>
//       <div style={{ marginTop: '1.5em' }}>{children}</div>
//     </div>
//   )
// }

export default function App({ children }) {
  return (
    <div className='app-container'>
      {children}
    </div>
  )
}
