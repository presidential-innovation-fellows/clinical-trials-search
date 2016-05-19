import React from 'react'
import { Link, browserHistory } from 'react-router'

export default function App({ children }) {
  return (
    <div className='app-container'>
      <div className='app-navigation'>
        <div className='container'>
          <Link to='/' className='logo'>
            <img src={'../images/nci-logo-full.svg'} alt='NCI Logo'/>
          </Link>
        </div>
      </div>
      <div className='page-container'>
        {children}
      </div>
    </div>
  )
}
