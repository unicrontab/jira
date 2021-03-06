// RDVCS Connector regexp provided by Atlassian
// (?:(?<=[\s\p{Punct}])|^)(\p{Lu}[\p{Lu}\p{Digit}_]+-\p{Digit}+)(?:(?=[\s\p{Punct}])|$)

// Java brackets equivalents: https://www.regular-expressions.info/posixbrackets.html

const punct = '!"\\#$%&\'()*+,\\-./:;<=>?@\\[\\\\\\]^_`{|}~'
const issueKeysRegex = new RegExp(`(?:(?<=[\\s${punct}])|^)([A-Z][A-Z\\d_]+-\\d+)(?:(?=[\\s${punct}])|$)`, 'g')
const commandRegex = /(?=#[A-Za-z-]+)/g
const timeRegex = /((?:(?:\d+[wdhm])\s*)+)\s*/

function parseTime (text) {
  if (!text) {
    return 0
  }

  return text.split(/\s+/)
    .map(time => {
      const marker = time.charAt(time.length - 1)
      const duration = parseInt(time.substring(0, time.length - 1), 10)

      switch (marker) {
        case 'w':
          return duration * 60 * 60 * 24 * 7
        case 'd':
          return duration * 60 * 60 * 24
        case 'h':
          return duration * 60 * 60
        case 'm':
          return duration * 60
      }
    })
    .reduce((totalTime, markerDurationInSeconds) => totalTime + markerDurationInSeconds)
}

function parseIssueKeys (text) {
  return text.match(issueKeysRegex) || undefined
}

function parseCommands (sourceText) {
  if (!sourceText) {
    return []
  }

  return sourceText.split(commandRegex)
    .map(commandText => commandText.trim())
    .map(commandText => {
      const commandTextIndex = commandText.search(/\s/)
      const command = commandText.substring(0, commandTextIndex === -1 ? undefined : commandTextIndex)
      let remainingText = commandText.substring(commandTextIndex + 1)

      return {
        command,
        remainingText,
        commandText
      }
    })
    .map(({ command, commandText, remainingText }) => {
      if (command === '#comment') {
        return {
          kind: 'comment',
          text: remainingText
        }
      } else if (command === '#time') {
        const time = remainingText.match(timeRegex)

        if (time) {
          remainingText = remainingText.substring(time[0].length)
        }

        return {
          kind: 'worklog',
          time: time ? parseTime(time[0].trim()) : 0,
          text: remainingText.length ? remainingText : undefined
        }
      } else {
        return {
          kind: 'transition',
          name: command.substring(1),
          text: remainingText === commandText ? undefined : remainingText
        }
      }
    })
}

module.exports = (sourceText) => {
  const commandTextIndex = sourceText.search(commandRegex)
  const issueKeysText = commandTextIndex === -1 ? sourceText : sourceText.substring(0, commandTextIndex)
  const commandText = commandTextIndex === -1 ? null : sourceText.substring(commandTextIndex)

  const issueKeys = parseIssueKeys(issueKeysText)

  return {
    issueKeys: issueKeys,
    commands: parseCommands(commandText)
      .map(command => ({
        ...command,
        issueKeys
      }))
  }
}
