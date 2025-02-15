import { FC, ReactNode } from "react"

interface Props {
    children: ReactNode;
}

const Layout: FC<Props> = (props) => {
    return <html lang="en">
        <body>
            <main>{props.children}</main>
        </body>
    </html>
}

export default Layout