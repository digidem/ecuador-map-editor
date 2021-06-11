import React from 'react'

import DateDistance from './DateDistance'

export default {
  title: 'internal/DateDistance'
}

export const oneWeek = () => (
  <DateDistance date={Date.now() - 7 * 24 * 60 * 60 * 1000} />
)

export const twoDays = () => (
  <DateDistance date={Date.now() - 2 * 24 * 60 * 60 * 1000} />
)

export const oneAndHalfHours = () => (
  <DateDistance date={Date.now() - 1.5 * 60 * 60 * 1000} />
)

export const thirtySeconds = () => (
  <DateDistance date={Date.now() - 30 * 1000} />
)

export const twoMinutes = () => (
  <DateDistance date={Date.now() - 2 * 60 * 1000} />
)

export const now = () => <DateDistance date={Date.now()} />
