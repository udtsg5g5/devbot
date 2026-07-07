import { successEmbed } from '../utils/embeds.js'; // Adjust relative path based on location
import { logEvent } from '../utils/moderation.js';
import { logger } from '../utils/logger.js';
import { sanitizeMarkdown } from '../utils/validation.js';
import { InteractionHelper } from '../utils/interactionHelper.js';

// Inside your interactionCreate block, check for Modal submissions:
if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith('staff_dm_modal_')) {
        // Defer the modal answer safely using your framework's helper
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`DM Modal interaction defer failed for ${interaction.user.id}`);
            return;
        }

        // Parse state parameters out of the customId
        const [, , , targetUserId, anonymousStr] = interaction.customId.split('_');
        const anonymous = anonymousStr === 'true';
        const rawMessage = interaction.fields.getTextInputValue('dm_text_payload');

        try {
            const targetUser = await interaction.client.users.fetch(targetUserId);
            const sanitized = sanitizeMarkdown(rawMessage);
            const dmChannel = await targetUser.createDM();

            // Send the exact message formatted beautifully as an embed card
            await dmChannel.send({
                embeds: [
                    successEmbed(
                        anonymous ? "Message from the Staff Team" : `Message from ${interaction.user.tag}`,
                        sanitized
                    ).setFooter({
                        text: `You cannot reply to this message. | Logger ID: ${interaction.id}`
                    })
                ]
            });

            // Log mod details internally
            await logEvent({
                client: interaction.client,
                guild: interaction.guild,
                event: {
                    action: "DM Sent",
                    target: `${targetUser.tag} (${targetUser.id})`,
                    executor: `${interaction.user.tag} (${interaction.user.id})`,
                    reason: `Anonymous: ${anonymous ? 'Yes' : 'No'}`,
                    metadata: {
                        userId: targetUser.id,
                        moderatorId: interaction.user.id,
                        anonymous,
                        messageLength: sanitized.length
                    }
                }
            });

            // Update staff feedback on successful delivery
            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    successEmbed(
                        "Success",
                        `Successfully sent a message to ${targetUser.tag}`
                    ),
                ],
            });

        } catch (error) {
            logger.error('DM modal handling error:', error);

            let errorMessage = `Failed to send DM: ${error.message}`;
            if (error.code === 50007) {
                errorMessage = 'Could not send a DM to that user. They may have DMs disabled or blocked the bot.';
            }

            // Return Error card cleanly using your standard layout design
            return await InteractionHelper.safeEditReply(interaction, {
                content: `❌ ${errorMessage}`
            });
        }
    }
}
