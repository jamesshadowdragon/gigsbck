export default async function handler(req, res) {
    const action = req.query.action || "discord";

    /*
    |--------------------------------------------------------------------------
    | ROBLOX
    |--------------------------------------------------------------------------
    */

    if (action === "roblox") {
        const username = String(
            req.query.username || ""
        ).trim();

        if (!username) {
            return res.status(400).json({
                success: false,
                message: "Roblox username is required."
            });
        }

        try {
            const robloxURL =
                "https://users.roblox.com/v1/users/search?" +
                new URLSearchParams({
                    keyword: username,
                    limit: "10"
                }).toString();

            const response = await fetch(robloxURL, {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "User-Agent": "Astral/1.0"
                }
            });

            const text = await response.text();

            let data;

            try {
                data = JSON.parse(text);
            } catch {
                data = null;
            }

            if (!response.ok) {
                return res.status(502).json({
                    success: false,
                    message: "Roblox API request failed.",
                    robloxHttp: response.status,
                    robloxResponse: data || text
                });
            }

            if (!data || !Array.isArray(data.data)) {
                return res.status(502).json({
                    success: false,
                    message: "Invalid response from Roblox API.",
                    robloxResponse: data || text
                });
            }

            const user = data.data.find(
                item =>
                    String(item.name).toLowerCase() ===
                    username.toLowerCase()
            );

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "Roblox account not found."
                });
            }

            const uid = String(user.id);

            let avatarURL = "";

            try {
                const avatarURLRequest =
                    "https://thumbnails.roblox.com/v1/users/avatar-headshot?" +
                    new URLSearchParams({
                        userIds: uid,
                        size: "150x150",
                        format: "Png",
                        isCircular: "false"
                    }).toString();

                const avatarResponse =
                    await fetch(avatarURLRequest);

                const avatarData =
                    await avatarResponse.json();

                avatarURL =
                    avatarData?.data?.[0]?.imageUrl || "";

            } catch {
                avatarURL = "";
            }

            return res.status(200).json({
                success: true,

                data: {
                    uid: uid,

                    username:
                        String(user.name),

                    displayName:
                        String(
                            user.displayName ||
                            user.name
                        ),

                    avatarURL: avatarURL,

                    robloxProfileURL:
                        `https://www.roblox.com/users/${uid}/profile`
                }
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: "Roblox API connection failed.",
                error: error.message
            });
        }
    }


    /*
    |--------------------------------------------------------------------------
    | DISCORD OAUTH
    |--------------------------------------------------------------------------
    */

    const {
        DISCORD_CLIENT_ID,
        DISCORD_CLIENT_SECRET,
        DISCORD_REDIRECT_URI
    } = process.env;

    const code = req.query.code;
    const state = req.query.state;

    if (!code) {
        return res.status(400).json({
            success: false,
            message: "Missing OAuth code."
        });
    }

    if (
        !DISCORD_CLIENT_ID ||
        !DISCORD_CLIENT_SECRET ||
        !DISCORD_REDIRECT_URI
    ) {
        return res.status(500).json({
            success: false,
            message: "OAuth environment variables are missing."
        });
    }

    try {
        const tokenResponse = await fetch(
            "https://discord.com/api/oauth2/token",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },

                body: new URLSearchParams({
                    client_id: DISCORD_CLIENT_ID,
                    client_secret: DISCORD_CLIENT_SECRET,
                    grant_type: "authorization_code",
                    code: code,
                    redirect_uri: DISCORD_REDIRECT_URI
                })
            }
        );

        const tokenData =
            await tokenResponse.json();

        if (
            !tokenResponse.ok ||
            !tokenData.access_token
        ) {
            return res.status(502).json({
                success: false,
                message: "Discord token exchange failed."
            });
        }

        const userResponse = await fetch(
            "https://discord.com/api/users/@me",
            {
                headers: {
                    Authorization:
                        `Bearer ${tokenData.access_token}`
                }
            }
        );

        const user =
            await userResponse.json();

        if (!userResponse.ok || !user.id) {
            return res.status(502).json({
                success: false,
                message:
                    "Unable to retrieve Discord user."
            });
        }

        let avatarURL = "";

        if (user.avatar) {
            avatarURL =
                `https://cdn.discordapp.com/avatars/` +
                `${user.id}/` +
                `${user.avatar}.png?size=256`;
        }

        return res.status(200).json({
            success: true,

            state: state || "",

            user: {
                id: user.id,

                username:
                    user.username || "",

                displayName:
                    user.global_name ||
                    user.username ||
                    "",

                avatarURL
            }
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "OAuth backend error.",
            error: error.message
        });
    }
}
