import { Settings as SettingsIcon, User } from "lucide-react";
import { useEffect, useState } from "react";

const Settings = () => {
    const [user, setUser] = useState<{ name: string; email: string } | null>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse user data", e);
            }
        }
    }, []);

    return (
        <div className="glass-strong rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-primary" />
                Settings
            </h3>
            <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-foreground mb-1 font-medium">Application Version</p>
                    <p className="text-sm text-muted-foreground">v1.0.0</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm text-foreground font-medium">User Profile</p>
                            <p className="text-xs text-muted-foreground">Currently logged in</p>
                        </div>
                    </div>

                    {user ? (
                        <div className="space-y-2 pl-1">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider">Name</p>
                                <p className="text-sm font-medium text-foreground">{user.name}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider">Email</p>
                                <p className="text-sm font-medium text-foreground">{user.email}</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No user logged in.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
