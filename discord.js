export default async function handler(req, res) {
    const {
        DISCORD_CLIENT_ID,
        DISCORD_CLIENT_SECRET,
        DISCORD_REDIRECT_URI
    } = process.env;

    if (!DISCORD_CLIENT_ID ||
        !DISCORD_CLIENT_SECRET ||
        !DISCORD_REDIRECT_URI) {

        return res.status(500).json({
            success: false,
            message: "Discord OAuth environment variables are missing."
        });
    }

    const { code, state } = req.query;

    if (!code || !state) {
        return res.status(400).json({
            success: false,
            message: "Missing OAuth code or state."
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

        if (!tokenResponse.ok ||
            !tokenData.access_token) {

            return res.status(502).json({
                success: false,
                message: "Discord token exchange failed.",
                discord: tokenData
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
                message: "Unable to retrieve Discord user."
            });
        }

        let avatarURL = "";

        if (user.avatar) {
            avatarURL =
                `https://cdn.discordapp.com/avatars/` +
                `${user.id}/${user.avatar}.png?size=256`;
        }

        /*
         * Return only the information your
         * InfinityFree dashboard needs.
         *
         * The Discord access token is NEVER
         * returned to the browser.
         */

        return res.status(200).json({
            success: true,
            state: state,
            user: {
                id: user.id,
                username: user.username || "",
                displayName:
                    user.global_name ||
                    user.username ||
                    "",
                avatarURL: avatarURL
            }
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "OAuth backend error."
        });
    }
}
