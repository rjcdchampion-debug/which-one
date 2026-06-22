import { useState } from 'react'
import { uuid } from '../lib/utils'

function getOrCreateVoterId() {
  const key = 'this_or_that_voter_id'
  const stored = localStorage.getItem(key)
  if (stored) return stored
  const id = uuid()
  localStorage.setItem(key, id)
  return id
}

export function useVoter() {
  const [voterId] = useState(getOrCreateVoterId)

  function hasVoted(postId) {
    return localStorage.getItem(`voted_${postId}`) !== null
  }

  function getVotedOption(postId) {
    return localStorage.getItem(`voted_${postId}`)
  }

  function recordVote(postId, optionId) {
    localStorage.setItem(`voted_${postId}`, optionId)
  }

  return { voterId, hasVoted, getVotedOption, recordVote }
}
