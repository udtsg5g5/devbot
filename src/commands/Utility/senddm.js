import { SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { logEvent } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { sanitizeMarkdown } from '../../utils/validation.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName("dm")
        .setDescription("Send a direct message to a user (Staff only)")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The user to send a DM to")
                .setRequired(true)
        )
        .addBooleanOption(option =>
            option
                .setName("anonymous")
                .setDescription("Send the message anonymously (default: false)")
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false),
    category: "moderation",

    async execute(interaction, config, client) {
        const targetUser = interaction.options.getUser("user");
        const anonymous = interaction.options.getBoolean("anonymous") || false;

        // 1. System Guardrails
        if (targetUser.bot) {
            // Note: If replyUserError is globally available in your framework, use it. 
            // Otherwise, this fallback ensures the interaction is answered safely.
            const errorContent = { content: '❌ You cannot send DMs to bot accounts.', ephemeral: true };
            return typeof replyUserError !== 'undefined' 
                ? await replyUserError(interaction, { type: 'UNKNOWN', message: 'You cannot send DMs to bot accounts.' })
                : await interaction.reply(errorContent);
        }

        try {
            // 2. Build the Popup Modal Frame
            // We append targetUser.id and anonymous state into the customId to pass it to the submission handler
            const modal = new ModalBuilder()
                .setCustomId(`staff_dm_modal_${targetUser.id}_${anonymous}`)
                .setTitle(`Message to ${targetUser.username}`);

            const messageInput = new TextInputBuilder()
                .setCustomId('dm_text_payload')
                .setLabel("Send your message below")
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Type the exact message or embed content text here...')
                .setMinLength(1)
                .setMaxLength(2000)
                .setRequired(true);

            const row = new ActionRowBuilder().addComponents(messageInput);
            modal.addComponents(row);

            // Show the modal popup directly to the staff member
            await interaction.showModal(modal);

        } catch (error) {
            logger.error('Failed to open DM modal:', error);
        }
    }
};
