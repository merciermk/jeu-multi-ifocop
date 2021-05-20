"use strict"
document.addEventListener('DOMContentLoaded', () => {
  const formtextEl = document.getElementById('formtext')
  const textToCopyEl = document.getElementById('text')
  const classementEl = document.getElementById('classement')

  const socket = io();
  var classementGame = []

  function startGame() {
    socket.emit('user_joined')
    socket.on('text', text => {
      if(textToCopyEl){
      textToCopyEl.innerText = text
      }
    })
  }

  startGame()
  if(formtextEl){
    formtextEl.addEventListener('submit', (e) => {
      e.preventDefault()
      let response = formtextEl.response.value
      if (response) {
        socket.emit('response', response)
        formtextEl.response.value = ''
      }
    })
  }

  socket.on('classement', (data) => {

    classementGame = ''
    data.forEach(user => {
      classementGame += `<li>${user.user} ${user.points}</li>`
    })
    if(classementEl){
      classementEl.innerHTML = classementGame;

    }
  })

})


