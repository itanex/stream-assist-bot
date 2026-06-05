# Stream Assist Bot

## About The Project

NodeJS application that interprets commands and events on Twitch for the dedicated channel.

## Built With

- Typescript
- NodeJS/Ts-Node
- PostgreSQL
- Sequelize/Typescript-Sequelize
- Docker

## Getting Started

### Install Dependencies

Install the latest Docker CLI / Docker Desktop.

> Note: Make sure Docker is running before attempting to start the application, otherwise the application will fail to connect to the database

```
npm install
```

### Twitch Authentication

On first run, if no auth token file is present, the application will guide you through the OAuth flow via the auth server (port 8090). Complete the flow in a browser and the bot will start automatically.

To pre-seed a token instead, create `auth-tokens.{TWITCH_BROADCASTER_ID}.json` in the mapped local-cache directory before starting. See `configurations/required-scopes.ts` for the required scopes.

### Deployment

> Note: Deployment is currently manual and local. CI/CD via a hosted service is not yet configured.

**First run or after code changes - rebuild the image and start:**

```bash
docker compose up --build -d
```

**Start without rebuilding (config or volume changes only):**

```bash
docker compose up -d
```

**Stop all containers:**

```bash
docker compose down
```

**Stream logs from the running app container:**

```bash
docker compose logs -f app
```

The `-d` flag detaches immediately after starting. Omit it to follow logs in the foreground, but prefer `docker compose logs -f app` for monitoring a running deployment.

## Usage

This application is distributed under the GPLv3 license and is expected to be executed under the same principles.

This application is designed as a chat-bot and stream management application, specifically for twitch. The use of this bot on other streaming services is not supported and the use of this bot, unless otherwised arranged, is at the users own risk.

## Contributing

Any contributions you make are greatly appreciated.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement". Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (git checkout -b feature/AmazingFeature)
3. Commit your Changes (git commit -m 'Add some AmazingFeature')
4. Push to the Branch (git push origin feature/AmazingFeature)
5. Open a Pull Request

## License

Distributed currently under GPLv3. For more infomation see the `License` file in the repository.

## Links

- [Project Link](https://github.com/users/itanex/projects/2/)
- [TwurpleJS](https://twurple.js.org/)
- [Sequelize](https://sequelize.org/)
- [Docker](https://www.docker.com/)

## Developed Live On Twitch Stream

[TimyTheTermite](https://twitch.tv/timythetermite)

Contact [TimyTheTermite](https://bsky.app/profile/timythetermite.bsky.social) on [Blue Sky](https://bsky.app/)
