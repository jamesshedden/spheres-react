import React, { Component } from 'react';
import _ from 'lodash';
import CSSTransitionGroup from 'react-transition-group/CSSTransitionGroup';
import Stars from './Stars';
import './App.css';

const MAX_CIRCLE_AMOUNT = 10;
const PARALLAX_AMOUNT_DIVISOR = 80;

const COLORS = ['#FF5130', '#A496FF', '#5CFF80'];

class App extends Component {
  constructor() {
    super();

    this.state = {
      circles: [],
      backgroundColor1: '#FEB522',
      backgroundColor2: '#370078',
      startedDraggingAt: 0,
      isDragging: false,
      activeCircle: null,
      stars: [],
      showDiv: false,
      circleElements: [],
      sphereCount: 0,
    };
  }

  componentDidMount() {
    window.addEventListener("resize", this.throttledWindowResize); // TODO: remove event listener on unmount
  }

  throttledWindowResize = () => {
    _.throttle(this.onWindowResize, 10)();
  }

  onWindowResize = () => {
    const circles = _.map(this.state.circles, (circle) => {
      return _.assign({}, circle, {
        top: (window.innerHeight / 100) * circle.distanceAsPercent.top,
        left: (window.innerWidth / 100) * circle.distanceAsPercent.left,
      });
    })

    this.setState({ circles });
  }

  randomNumber = (min, max) => Math.floor(Math.random() * max) + min;

  getPointerCoordinatesFromCentre = (positionX, positionY) => {
    return {
      x: (window.innerWidth / 2) - positionX,
      y: (window.innerHeight / 2) - positionY,
    };
  }

  roundToTwo = (input) => _.round(input, 2);

  getTranslateAmountsFromCoordinates = (coordinates, multiplierFromZero, divisor) => {
    // multiplier comes from the counter, or the array index of a circle element, so
    // will sometimes be 0 or 1 but we don't want to multiply by these
    const MULTIPLIER_BUFFER = 2;

    const multiplier = multiplierFromZero + MULTIPLIER_BUFFER

    const translateX = (coordinates.x * (multiplier)) / divisor;
    const translateY = (coordinates.y * (multiplier)) / divisor;

    return {
      translateX,
      translateY,
    };
  }

  repositionCircles = (circles, pageX, pageY) => {
    let totals = _.map(circles, (circle, index) => {
      let el = document.getElementById(`circle-${ circle.id }`);
      let { top, left } = circle;
      let { transform } = el.style;
      let { translateX, translateY } = this.returnTransformValuesAsNumbers(transform);

      return {
        id: circle.id,
        totals: {
          vertical: top + translateY,
          horizontal: left + translateX,
        }
      }
    });

    circles = _.merge([], circles, totals);

    let repositionedCircles = _.map(circles, (circle, index) => {
      const { translateX, translateY } = this.getTranslateAmountsFromCoordinates(
        this.getPointerCoordinatesFromCentre(pageX, pageY),
        index - 1,
        PARALLAX_AMOUNT_DIVISOR,
      );

      let top = circle.totals.vertical - translateY;
      let left = circle.totals.horizontal - translateX;

      return {
        id: circle.id,
        top,
        left,
        totals: {
          vertical: top + translateY, // just for debugging
          horizontal: left + translateX,
        },
        translateX,
        translateY,
      }
    });

    circles = _.merge([], circles, repositionedCircles);
    return circles;
  }

  removeCircleSurplus = (circles) => {
    if (circles.length > MAX_CIRCLE_AMOUNT) {
      let circleToBeRemoved = document.getElementById(`circle-${ circles[0].id }`);

      let cloned = circleToBeRemoved.cloneNode(true);
      cloned.className = 'removed-circle';
      cloned.id = '';
      document.body.appendChild(cloned);

      setTimeout(() => {
        document.body.removeChild(cloned);
      }, 1000)

      return circles.slice(1, circles.length);
    } else {
      return circles;
    }
  }

  makeCircle = (event) => {
    if (event.type === 'touchend') {
      event = event.nativeEvent;
    } else {
      event.persist();
    }

    let { pageX, pageY } = event;

    const randomDimension = this.randomNumber(100, 250);

    const multiplierForTranslateAmounts = this.state.sphereCount > MAX_CIRCLE_AMOUNT ?
      MAX_CIRCLE_AMOUNT - 1 : this.state.sphereCount;

    const { translateX, translateY } = this.getTranslateAmountsFromCoordinates(
      this.getPointerCoordinatesFromCentre(pageX, pageY),
      multiplierForTranslateAmounts,
      PARALLAX_AMOUNT_DIVISOR,
    );

    let color = COLORS[this.randomNumber(0, COLORS.length)];

    let circles = this.state.circles;

    let top = pageY - translateY - (randomDimension / 2);
    let left = pageX - translateX - (randomDimension / 2);

    if (this.state.sphereCount >= MAX_CIRCLE_AMOUNT) {
      circles = this.repositionCircles(circles, pageX, pageY);
    }

    circles.push({
      id: this.state.sphereCount,
      color,
      width: randomDimension,
      height: randomDimension,
      distanceAsPercent: {
        top: (top * 100) / window.innerHeight,
        left: (left * 100) / window.innerWidth,
      },
      top,
      left,
      translateX,
      translateY,
    });

    circles = this.removeCircleSurplus(circles);

    const arrayOfIndexes = _.map([...Array(circles.length)], (_, index) => {
      return { index };
    });

    circles = _.merge([], circles, arrayOfIndexes);

    this.setState({
      circles,
      sphereCount: this.state.sphereCount + 1,
    }, () => {
      this.setState({
        circleElements: document.getElementsByClassName('circle'),
      });
    });
  };

  returnTransformValuesAsNumbers = (values) => {
    let numbers = values.match(/\(.*?\)/g);

    return {
      translateX: parseFloat(numbers[0].replace(/[^0-9|.|-]/g, '')),
      translateY: parseFloat(numbers[1].replace(/[^0-9|.|-]/g, '')),
    }
  }

  transformCircles = (circles, x, y) => {
    _.forEach(circles, (circle, index) => {
      const { translateX, translateY } = this.getTranslateAmountsFromCoordinates(
        this.getPointerCoordinatesFromCentre(x, y),
        index,
        PARALLAX_AMOUNT_DIVISOR,
      );

      circle.style.transform = `translateX(${ translateX }px) translateY(${ translateY }px)`;
    });
  }

  sphereDrag = (pageX, pageY, width) => {
    let activeCircleIndex = _.find(this.state.circles, { id: this.state.activeCircle.id }).index;

    const { translateX, translateY } = this.getTranslateAmountsFromCoordinates(
      this.getPointerCoordinatesFromCentre(pageX, pageY),
      activeCircleIndex,
      PARALLAX_AMOUNT_DIVISOR,
    );

    let { top, left } = this.getPosition(
      pageX,
      pageY,
      translateX,
      translateY,
      width
    );

    return {
      top,
      left,
      translateX,
      translateY
    }
  }

  transformActiveCircle = (pageX, pageY) => {
    let activeCircleIndex = _.findIndex(this.state.circles, { id: this.state.activeCircle.id });

    const {
      top,
      left,
      translateX,
      translateY,
    } = this.sphereDrag(pageX, pageY, this.state.circles[activeCircleIndex].width);

    let distanceAsPercent = {
      top: (top * 100) / window.innerHeight,
      left: (left * 100) / window.innerWidth,
    };

    let newCircles = this.state.circles;

    newCircles[activeCircleIndex] = _.assign({}, newCircles[activeCircleIndex], {
      distanceAsPercent,
      top,
      left,
      translateX,
      translateY,
    });

    this.setState({ circles: newCircles });
  }

  getPosition = (pageX, pageY, translateX, translateY, dimension) => {
    const { pointerDistanceFromCircleCentre } = this.state.activeCircle;

    const top = pageY - translateY - (dimension / 2) - pointerDistanceFromCircleCentre.y;
    const left = pageX - translateX - (dimension / 2) - pointerDistanceFromCircleCentre.x;

    return {
      top,
      left,
    };
  }

  moveActiveCircle = (element, pageX, pageY) => {
    const {
      top,
      left,
      translateX,
      translateY,
    } = this.sphereDrag(pageX, pageY, element.offsetWidth);

    element.style.top = `${ top }px`;
    element.style.left = `${ left }px`;
    element.style.transform = `translateX(${ translateX }px) translateY(${ translateY }px)`
  }

  onMouseMove = (event) => {
    console.log('onMouseMove()');
    const { pageX, pageY } = event;

    if (this.state.circleElements.length) {
      this.transformCircles(this.state.circleElements, pageX, pageY);
    }

    if (this.state.activeCircle) {
      this.moveActiveCircle(this.state.activeCircle.element, pageX, pageY);
    }
  }

  onMouseDown = (event) => {
    if (!_.includes(event.target.classList, 'circle')) {
      this.setState({ activeCircle: null });
    }
  }

  throttledMouseMove = (event) => {
    if (event.type === 'touchend') {
      event = event.nativeEvent;
    } else {
      event.persist();
    }

    _.throttle(this.onMouseMove.bind(this, event), 20)();
  }

  onMouseUp = (event) => {
    if (this.state.activeCircle && event.timeStamp - this.state.activeCircle.activeAt > 200) {
      this.transformActiveCircle(event.pageX, event.pageY);
      this.setState({ activeCircle: null });
    } else {
      this.makeCircle(event);
      this.setState({ activeCircle: null });
    };
  }

  onCircleMouseDown = (event, circle) => {
    if (event.type === 'touchend') {
      event = event.nativeEvent;
    }

    const { pageX, pageY } = event;

    const {
      id,
      left,
      top,
      width,
      height,
    } = circle;

    let { transform } = event.target.style;
    let { translateX, translateY } = this.returnTransformValuesAsNumbers(transform);

    let activeCircleCentreCoordinates = {
      x: left + (width / 2),
      y: top + (height / 2),
    }

    let pointerDistanceFromCircleCentre = {
      x: pageX - translateX - activeCircleCentreCoordinates.x,
      y: pageY - translateY - activeCircleCentreCoordinates.y,
    }

    this.setState({
      activeCircle: {
        id,
        element: event.target,
        activeAt: event.timeStamp,
        pointerDistanceFromCircleCentre,
      },
    });
  }

  render() {
    return (
      <div id="content" className="content"
      onMouseMove={ this.throttledMouseMove }
      onTouchMove={ this.throttledMouseMove }
      onMouseDown={ this.onMouseDown }
      onTouchStart={ this.onMouseDown }
      onMouseUp={ this.onMouseUp }
      onTouchEnd={ this.onMouseUp }
      >
        <div style={ {
          width: '0px',
          height: '0px',
          overflow: 'hidden',
          position: 'absolute',
          top: '-9999px',
          left: '-9999px',
          background: `
            url('/dots-dark.png'),
            url('/dots-light.png')
          `
        } }/>
        <div className="content__overlay"></div>

        <CSSTransitionGroup
        transitionName="circle"
        transitionEnterTimeout={200}
        transitionLeaveTimeout={1}>
          { this.state.circles.map((circle, index) => {
            return (
              <div className="circle"
              id={ `circle-${ circle.id }` }
              key={ circle.id }
              onMouseDown={ (event) => {
                this.onCircleMouseDown(event, circle)
              } }
              onTouchStart={ (event) => {
                this.onCircleMouseDown(event, circle)
              } }
              style={ {
                background: `
                  linear-gradient(
                    45deg,
                    ${ this.state.backgroundColor2 } 0%,
                    ${ circle.color } 100%
                  )
                `,
                transform: `translateX(${ circle.translateX }px) translateY(${ circle.translateY }px)`,
                top: `${ circle.top }px`,
                left: `${ circle.left }px`,
                width: circle.width,
                height: circle.height,
              } }>
                {/* <div style={{background: 'white', flex: '1 1 auto', fontSize: '15px', fontWeight: 'bold'}}>
                  {circle.id}
                </div> */}

                {/* <div className="circle__inner" style={ {
                  background: `
                    linear-gradient(
                      45deg,
                      ${ this.state.backgroundColor2 } 0%,
                      ${ circle.color } 100%
                    )
                  `,
                } } /> */}
              </div>
            );
          }) }
        </CSSTransitionGroup>

        <Stars key={ 1 } />
        <Stars key={ 2 } />
        <Stars key={ 3 } />
        <Stars key={ 4 } />
        <Stars key={ 5 } />
      </div>
    );
  }
}

export default App;
