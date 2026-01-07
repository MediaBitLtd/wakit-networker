<h1 align="center">Wakit Networker</h1>
<h3 align="center">The network system for wakit</h3>

---

## Installation

`npm i @wakit/networker`

## Usage

##### Network

Using network as a wrapper of axios is super easy.

```typescript
import { network } from '@wakit/networker'

const data = await network.get('/user')
```

##### Axios

You can access axios directly by using the following:

```typescript
import { network } from '@wakit/networker'

const axios = network.axios
```

