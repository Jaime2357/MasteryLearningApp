import React from 'react'
import { logout } from './actions'



const Page = () => {
  
  return (
    <body>
      <div>hello</div>
      <div>
        <button onClick={logout}>
          Sign Out
        </button>
      </div>
    </body>

  )
}

export default Page