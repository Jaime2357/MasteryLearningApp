"use client"

import { useRouter } from 'next/navigation';
import type { FC, ReactNode } from "react";
import { RouterProvider } from 'react-aria-components';

declare module 'react-aria-components' {
	interface RouterConfig {
		routerOptions: NonNullable<
			Parameters<ReturnType<typeof useRouter>['push']>[1]
		>;
	}
}

interface Props {
	children: ReactNode;
}

const ClientProviders: FC<Props> = props => {
	const router = useRouter();
	return (
		<RouterProvider navigate={router.push}>
			{props.children}
		</RouterProvider>
	);
}

export default ClientProviders;