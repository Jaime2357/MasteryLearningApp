import { FC, ReactNode } from "react";
import "./globals.css";
import ClientProviders from "@/utils/provider";

interface Props {
	children: ReactNode;
}

const Layout: FC<Props> = props => {
	return <html lang="en">
		<body>
			<ClientProviders>{props.children}</ClientProviders>
		</body>
	</html>
}

export default Layout