import React from 'react'
import { logout } from './actions'



const Page = () => {
  
  return (
    <main>
      <div>hello</div>
      <div>
        <button onClick={logout}>
          Sign Out
        </button>
      </div>
    </main>

  )
}

export default Page