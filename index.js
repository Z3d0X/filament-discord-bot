const { Client, GatewayIntentBits, Collection, Events } = require('discord.js')
const v3when = require('./commands/v3when')

require('dotenv').config()

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions]
})

const commands = new Collection()
commands.set(v3when.data.name, v3when)

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`)
})

client.on('threadCreate', async (thread) => {
    if (! thread.joinable) {
        return
    }
    
    await thread.join()
})

client.on('messageReactionAdd', async (reaction) => {
    const replies = {
        '👀': `We're confident that you can find the answer to this question in the docs. Please visit <https://filamentphp.com/docs> and use the search input to find what you are looking for. If you are still having trouble, please reply to this message to provide more information about your use case.`,
        '✨': `Please run \`php artisan filament:upgrade\`, recompile any frontend assets you may have, clear your browser cache, and delete the \`/resources/views/vendor\` directory if it exists. If the problem still persists, please reply to this message and let us know.`,
        '🤔': `We're confused about what you mean by this question. Please read the <#${process.env.GUIDELINES_CHANNEL_ID}> and reply to this message to provide more information about your use case.`,
        '❌': `It seems that your question is not related to Filament. To help as many Filament users as possible, we need to be selective over which questions get posted here.`,
        '🧐': `We need more information to help you debug your problem. Please click on the top left 'SHARE' button of the error page you're seeing and share the link with us.`,
        '🙅‍♂️': `Please ask about the actual _problem_ you're trying to solve, instead of your attempted _solution_. <https://xyproblem.info>`,
        '🥴': `Please read the <#${process.env.GUIDELINES_CHANNEL_ID}> about how to format your code properly.`,
        '✋': `Your question is posted in the wrong channel. Each package and plugin has its own channel.`,
        '⬆️': `Please upgrade to the latest Filament version using \`composer update\`.`,
        '🔀': `Please don't post the same message across different channels.`,
        '🖼️': `https://filamentphp.com/tricks/file-upload-previews-not-loading`,
    }

    if (! reaction.emoji.name in replies) {
        return
    }

    const reactors = await reaction.users.fetch()
    const memberManager = reaction.message.guild.members

    let shouldReply = false

    for (const [reactorId, reactor] of reactors) {
        const member = await memberManager.fetch(reactor)

        if (! member.roles.cache.has(process.env.ADMIN_ROLE_ID)) {
            continue
        }
        
        shouldReply = true
        
        break
    }

    if (! shouldReply) {
        return
    }

    const message = replies[reaction.emoji.name] ?? null

    if (! message) {
        return
    }

    await reaction.remove()
    await reaction.message.reply({ content: message })
})

client.on(Events.InteractionCreate, async interaction => {
    if (! interaction.isChatInputCommand()) return

    const command = commands.get(interaction.commandName)

    if (! command) return;

    try {
        await command.execute(interaction)
    } catch (e) {
        console.error(e)

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true })
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true })
        }
    }
})

client.login(process.env.TOKEN).then(() => {
    client.user.setPresence({
        'activities': [{
            'name': 'Filament users',
            'type': 'WATCHING',
        }],
    })
})
