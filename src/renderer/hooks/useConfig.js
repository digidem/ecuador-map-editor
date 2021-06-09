import {useEffect, useState} from 'react'
import api from '../new-api'

export function useConfig () {
const [encryptionKey, setEncryptionKey] = useState(null)
  const [metadata, setMetadata] = useState({})

  // Check encryption key on load
  useEffect(() => {
    const check = async () => {
      const encryptionKey = await api.getEncryptionKey()
      setEncryptionKey(encryptionKey)
      const metadata = await api.getMetadata()
      setMetadata(metadata)
    }
    check()
  }, [])

  return {encryptionKey, metadata}
}
