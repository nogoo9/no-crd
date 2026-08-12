import React from "react";

export const I = {
	lock: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
		</svg>
	),
	plus: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2} d="M12 4v16m8-8H4" />
		</svg>
	),
	trash: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
		</svg>
	),
	spark: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2} d="M13 10V3L4 14h7v7l9-11h-7z" />
		</svg>
	),
	terminal: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
		</svg>
	),
	eye: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
		</svg>
	),
	back: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
		</svg>
	),
	settings: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
		</svg>
	),
	cross: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2.5} d="M6 18L18 6M6 6l12 12" />
		</svg>
	),
	users: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
		</svg>
	),
	user: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
		</svg>
	),
	search: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
		</svg>
	),
	refresh: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18" />
		</svg>
	),
	grid: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
		</svg>
	),
	list: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2} d="M4 6h16M4 12h16M4 18h16" />
		</svg>
	),
	info: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
		</svg>
	),
	key: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
		</svg>
	),
	shieldCheck: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
		</svg>
	),
	tweak: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
		</svg>
	),
	externalLink: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
		</svg>
	),
	sync: (props: any) => (
		<svg className={props.className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={props.style}>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2.2} d="M23 4v6h-6M1 20v-6h6" />
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={props.strokeWidth || 2.2} d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
		</svg>
	),
};
