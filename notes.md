https://manuelstofer.github.io/pinchzoom/
https://swipe.js.org/

unfortunately, neither of these support desktop

https://zingchart.github.io/zingtouch/

this looks potentially usable, to replace gesture_recognizer.js

alternatively, we can fix gesture_recognizer. it shouldn't be too hard, just a minor change
to the event order. basically make it emit a start event where you return handlers for
update, end, and cancel. and make it so if an event changes types, it cancels the previous
event and creates a new one.