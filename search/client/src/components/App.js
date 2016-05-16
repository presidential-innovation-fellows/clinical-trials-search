import React from 'react'
import { Link, browserHistory } from 'react-router'

export default function App({ children }) {
  return (
    <div className='app-container'>
      {children}
    </div>
  )
}
