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

### Generate Twitch API Token

1. Identify twitch User Id
2. Create `auth-token.%twitch-user-id%.json` file in the `/local-cache` folder
   - See `/configuration/required-scopes.ts` for list of required scopes
3. Generate an API Token for that user Id
4. Store token result in the token file

### Starting the application

`npm start` script will ensure that the docker resources are set up before starting the actual application code.

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

Contact [TimyTheTermite](https://x.com/timythetermite) on [x.com](https://x.com)
