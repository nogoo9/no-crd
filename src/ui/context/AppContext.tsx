import React, { createContext, useContext, useState } from "react";

export interface UserCapabilities {
	isAdmin: boolean;
	canRead: boolean;
	canWrite: boolean;
	userSub: string;
}

export interface WorkspaceItem {
	id: string;
	podName: string;
	status: string;
	templateRef?: string;
	templateVersion?: string;
	latestTemplateVersion?: string;
	isOutdated?: boolean;
	workspacePath?: string;
	previewPath?: string;
	workspaceType?: string;
	owner?: string;
	lastUpgradeError?: string;
}

export interface AppContextType {
	theme: string;
	setTheme: (t: string) => void;
	workspaces: WorkspaceItem[];
	setWorkspaces: React.Dispatch<React.SetStateAction<WorkspaceItem[]>>;
	capabilities: UserCapabilities;
	setCapabilities: React.Dispatch<React.SetStateAction<UserCapabilities>>;
	selectedWorkspace: WorkspaceItem | null;
	setSelectedWorkspace: (ws: WorkspaceItem | null) => void;
	isConsoleOpen: boolean;
	setIsConsoleOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [theme, setTheme] = useState<string>("dark");
	const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
	const [capabilities, setCapabilities] = useState<UserCapabilities>({
		isAdmin: false,
		canRead: true,
		canWrite: true,
		userSub: "",
	});
	const [selectedWorkspace, setSelectedWorkspace] =
		useState<WorkspaceItem | null>(null);
	const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(false);

	return (
		<AppContext.Provider
			value={{
				theme,
				setTheme,
				workspaces,
				setWorkspaces,
				capabilities,
				setCapabilities,
				selectedWorkspace,
				setSelectedWorkspace,
				isConsoleOpen,
				setIsConsoleOpen,
			}}
		>
			{children}
		</AppContext.Provider>
	);
};

export function useApp(): AppContextType {
	const ctx = useContext(AppContext);
	if (!ctx) {
		throw new Error("useApp must be used within an AppProvider");
	}
	return ctx;
}
