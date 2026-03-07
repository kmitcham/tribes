// Lightweight internal replacements for Discord's SlashCommandBuilder and EmbedBuilder.
// These are used by command modules and the web UI but have no external API dependencies.

class CommandOptionBuilder {
  constructor(type) {
    this.type = type; // 'string' | 'integer' | 'boolean' | 'user'
    this.name = '';
    this.description = '';
    this.required = false;
    this.choices = [];
  }

  setName(name) {
    this.name = name;
    return this;
  }

  setDescription(description) {
    this.description = description;
    return this;
  }

  setRequired(required) {
    this.required = !!required;
    return this;
  }

  addChoices(...choices) {
    // Choices are simple { name, value } objects
    this.choices.push(...choices);
    return this;
  }
}

class SlashCommandBuilder {
  constructor() {
    this.name = '';
    this.description = '';
    this.options = [];
  }

  setName(name) {
    this.name = name;
    return this;
  }

  setDescription(description) {
    this.description = description;
    return this;
  }

  addStringOption(configure) {
    const option = new CommandOptionBuilder('string');
    const built = configure ? configure(option) || option : option;
    this.options.push(built);
    return this;
  }

  addIntegerOption(configure) {
    const option = new CommandOptionBuilder('integer');
    const built = configure ? configure(option) || option : option;
    this.options.push(built);
    return this;
  }

  addBooleanOption(configure) {
    const option = new CommandOptionBuilder('boolean');
    const built = configure ? configure(option) || option : option;
    this.options.push(built);
    return this;
  }

  addUserOption(configure) {
    const option = new CommandOptionBuilder('user');
    const built = configure ? configure(option) || option : option;
    this.options.push(built);
    return this;
  }

  // Provide a JSON-friendly representation similar to Discord's builder.
  toJSON() {
    return {
      name: this.name,
      description: this.description,
      options: this.options.map((opt) => ({
        type: opt.type,
        name: opt.name,
        description: opt.description,
        required: opt.required,
        choices: opt.choices && opt.choices.length > 0 ? opt.choices : undefined,
      })),
    };
  }
}

class EmbedBuilder {
  constructor() {
    this.description = '';
  }

  setDescription(description) {
    this.description = description;
    return this;
  }
}

module.exports = {
  SlashCommandBuilder,
  EmbedBuilder,
};

